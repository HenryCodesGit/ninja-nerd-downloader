const sectionData = require('../input/files.json'); //Supply input.json from the downloaded sectionDataScraper.js function

const fs = require('fs').promises;
const createWriteStream = require('fs').createWriteStream;
const existsSync = require('fs').existsSync;
const mkDir = require('fs').mkdir;

const path = require('path');
const process = require('process');

/* Before to run these commands first
*	'npm install @google-cloud/local-auth'
*	'npm install googleapis@27 --save'
*
* Instructions on setting up Google Auth here: https://medium.com/@humadvii/downloading-files-from-google-drive-using-node-js-3704c142a5f6
* Wayback link: https://web.archive.org/web/20240124212753/https://medium.com/@humadvii/downloading-files-from-google-drive-using-node-js-3704c142a5f6
*/

const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

const sanitize = require("sanitize-filename"); /* Need to run 'npm install sanitize-filename' first */

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.metadata.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), './.google-api/token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), './.google-api/credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function downloadFile(auth,fileID,sectionName,lectureName,fileName) {
const drive = google.drive({version: 'v3', auth});
	drive.files.get(
		{
			fileId: fileID,
			alt: 'media',
			supportsAllDrives: true
		},
		{	responseType: 'stream',
		},
		async function(err, res){
			if(!existsSync(`./output/${sectionName}/${lectureName}/`)) mkDir(`./output/${sectionName}/${lectureName}/`, {recursive: true}, () => {writeStream();}); 
			else writeStream();
			
			function writeStream(){
				let dest = createWriteStream(`./output/${sectionName}/${lectureName}/${fileName}`);
				res.data
				.on('end', () => {
					console.log('Done');
				})
				.on('error', err => {
					console.log('Error', err);
				})
				.pipe(dest);
			}
		});
}

async function getFileName(auth, fileID){
	let name; 
	const drive = google.drive({version: 'v3', auth});
	drive.files.get(
		{
			fileId: fileID,
			supportsAllDrives: true
		},
		async function(err, res){
			name = res.data.name
		}
	);

	while(!name){await new Promise((resolve)=>{setTimeout(resolve,500)})};
	return name;
}

async function processJSON(){
	const regex = /(^https:\/\/drive\.google\.com\/file\/d\/(?<fileID>.+?)\/|id=(?<fileID2>.+))/;

	for await(const section of sectionData){
		for (const lecture of section.links){
			for (const link of lecture.links){
				// console.log(section.name);
				// console.log(lecture.name);
				// console.log(link);
	
				const matches = link.match(regex)
				//Regex has two matching groups, but only one will ever be defined.
				const fileID = (matches.groups.fileID) ? matches.groups.fileID : matches.groups.fileID2;
	
				let fileName = await authorize().then((auth)=>{return getFileName(auth,fileID)});
				while(!fileName){await new Promise((resolve)=>{setTimeout(resolve,500)})};

				await authorize().then((auth)=>{
					console.log(`Downloading.. ${fileName}`);
					downloadFile(auth,fileID,sanitize(section.name),sanitize(lecture.name),sanitize(fileName));
				})
			}
		}
	}
	console.log('Done');
}

processJSON();