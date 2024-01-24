
async function runDownloader(){
	/* Once within a 'note category' such as Renal, Neurology, etc'... */

/* Pull the link for every lecture note into an array*/
let contentSections = document.querySelectorAll('.category-section');
let sectionArray = [];
contentSections.forEach((section) => {
	let output = {};

	let sectionName = section.children[0].id
	output['name'] = sectionName;
	
	let sectionLinks = section.querySelector('.lecture-list');
	
	let links = [];
	sectionLinks.childNodes.forEach((link)=>{
		let href = link.querySelector('a').href
		links.push(href);
	});
	output['links'] = links;
	
	sectionArray.push(output);
});

/* Format of sectionArray is...
[
	{
		name: 'physiology',
		links: [
			http://google.ca,
			http://google.ca,
			...
			...
		]
	},
		{
		name: 'physiology',
		links: [
			http://google.ca,
			http://google.ca,
			...
			...
		]
	}
]

/* *************************************************************************************** */

/* Remap each link to an object that contains the files to download */
let j = 0;
for await(const section of sectionArray){
	for(let i = 0; i<section.links.length; i++){
		let output = await linkScraper(section.links[i]);
		section.links[i] = output;
		console.log(`Finished ${i} of ${section.links.length}`)
	}
	console.log(`Finished section: ${j++} of ${sectionArray.length}`);
}

/* This function asyncronously returns an object of the following format 
{
	name: name of the lesson
	links: array of urls to downoad
}
*/

async function linkScraper(link){

	let linkWindow = window.open(link,"_notes","height=10,width=10");
	while(!linkWindow.document.querySelector('.resource-h1')) await new Promise(r => setTimeout(r, 500));

	let pageLinks = [];
	let noteName = linkWindow.document.querySelector('.resource-h1').textContent;
	let productLinks = linkWindow.document.querySelector('.product-member-block').querySelectorAll('a[href*="drive.google"]');
	productLinks.forEach((link) => {
		pageLinks.push(link.href);
	});

	
	let illustration = linkWindow.document.querySelector('.lecture-ref-wrapper a[href*="illustration"]')?.href
	if(!illustration) return ({name: noteName, links: pageLinks});
	
	let doneLoading = false;
	let newWindow = window.open(illustration,"_illustrations","height=10,width=10");
	newWindow.addEventListener('DOMContentLoaded', async ()=>{
		while(
			newWindow.document.querySelector('.rtb-no-product').classList.contains('w-condition-invisible') //This must be invisible. If it's visible then just continue
		 	&& newWindow.document.querySelector('.product-member-block').querySelectorAll('a[href*="drive.google"]').length <= 0
		 ) await new Promise(r => setTimeout(r, 500));

		let productLinks = newWindow.document.querySelector('.product-member-block').querySelectorAll('a[href*="drive.google"]');
		productLinks.forEach((link) => pageLinks.push(link.href));

		newWindow.window.close();
		linkWindow.window.close();
		doneLoading = true;
	}, true);

	while(!doneLoading) await new Promise(r => setTimeout(r, 500));
	return ({name: noteName, links: pageLinks});
}


/* *************************************************************************************** */

}

// let finalLinks = [];
// json.forEach((section) =>{
// 	section.links.forEach((link) =>{
// 		console.log(link.links);
// 		finalLinks = [...finalLinks, ...link.links];
// 	})
// })

// let regex = /(^https:\/\/drive\.google\.com\/file\/d\/(?<fileID>.+?)\/|id=(?<fileID2>.+))/;
// finalLinks = finalLinks.map((link)=>{
// 	let result = link.match(regex);
// 	return (result.groups.fileID) ? result.groups.fileID : result.groups.fileID2;
// })


async function fetchDriveFileName(fileID, API_KEY){
	fetch(`https://www.googleapis.com/drive/v3/files/${fileID}?supportsAllDrives=true&key=${API_KEY}`)
		.then((data)=>data.json())
		.then((json)=>json.name)
		.catch((e) => {
			console.log(e);
		});
}

async function fetchDriveFileURL(fileID, API_KEY){
	fetch(`https://www.googleapis.com/drive/v3/files/${fileID}?supportsAllDrives=true&key=${API_KEY}&alt=media`)
		.then((data)=>data.blob())
		.then((blob)=>window.URL.createObjectURL(blob))
		.catch((e)=>{
			console.log(e)
		})
}

async function downloadFileAs(fileName, url){
	const a = document.createElement('a');
			a.style.display = 'none';
			a.href = url;
			a.download = fileName;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
}

