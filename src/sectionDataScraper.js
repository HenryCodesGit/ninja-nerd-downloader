async function sectionDataScraper(){

	const SECTION_CATEGORIES_QUERY  = '.category-section';
	const LECTURE_LIST_QUERY  = '.lecture-list';
	const LECTURE_NAME_QUERY = '.resource-h1';
	const LINK_CONTAINER_QUERY = '.product-member-block';
	const GOOGLE_DRIVE_LINK_QUERY = 'a[href*="drive.google"]';
	const LECTURE_ILLUSTRATIONS_LINK_QUERY = '.lecture-ref-wrapper a[href*="illustration"]'
	const LECTURES_ITEMS_LIST_QUERY = '.rtb-no-product'
	const LECTURE_CONTAINS_ITEMS_QUERY = 'w-condition-invisible';


	/* Pull the link to every lecture pages */
	let contentSections = document.querySelectorAll(SECTION_CATEGORIES_QUERY);
	let sectionArray = [];
	contentSections.forEach((section) => {
		const links = [];
		const sectionLinks = section.querySelector(LECTURE_LIST_QUERY );
		sectionLinks.childNodes.forEach((link)=>links.push(link.querySelector('a').href));
		
		sectionArray.push({
			name: section.children[0].id,
			links: links,
		});
	});

	/* *************************************************************************************** */

	/* Remap the links so that instead of reporting the lecture page, it reports the list of .PDF documents in each page */
	let count = 0;
	for await(const section of sectionArray){
		for(let i = 0; i<section.links.length; i++){
			let output = await linkScraper(section.links[i]);
			section.links[i] = output;
			console.log(`Section ${count} of ${sectionArray.length}.. Finished ${i} of ${section.links.length}`);
		}
		console.log(`Finished section: ${count++} of ${sectionArray.length}`);
	}

    console.log('done!');
    return sectionArray;

	/* This function asyncronously returns an object of the following format 
		{name: string, links: array of urls to download}
	*/
	async function linkScraper(link){

		let linkWindow = window.open(link,"_notes","height=10,width=10");
		while(!linkWindow.document.querySelector(LECTURE_NAME_QUERY)) await new Promise(r => setTimeout(r, 500));

		let pageLinks = [];
		let noteName = linkWindow.document.querySelector(LECTURE_NAME_QUERY).textContent;
		let productLinks = linkWindow.document.querySelector(LINK_CONTAINER_QUERY).querySelectorAll(GOOGLE_DRIVE_LINK_QUERY);
		productLinks.forEach((link) => {
			pageLinks.push(link.href);
		});

		
		let illustration = linkWindow.document.querySelector(LECTURE_ILLUSTRATIONS_LINK_QUERY)?.href
		if(!illustration) return ({name: noteName, links: pageLinks});
		
		let doneLoading = false;
		let newWindow = window.open(illustration,"_illustrations","height=10,width=10");
		newWindow.addEventListener('DOMContentLoaded', async ()=>{
			while(
				newWindow.document.querySelector(LECTURES_ITEMS_LIST_QUERY).classList.contains(LECTURE_CONTAINS_ITEMS_QUERY)
				&& newWindow.document.querySelector(LINK_CONTAINER_QUERY).querySelectorAll(GOOGLE_DRIVE_LINK_QUERY).length <= 0
			) await new Promise(r => setTimeout(r, 500));

			let productLinks = newWindow.document.querySelector(LINK_CONTAINER_QUERY).querySelectorAll(GOOGLE_DRIVE_LINK_QUERY);
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

sectionDataScraper()
    .then((sectionArray)=>{
        let output = JSON.stringify(sectionArray);

        var hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:attachment/text,' + encodeURI(output);
        hiddenElement.target = '_blank';
        hiddenElement.download = `${document.title}.json`;
        hiddenElement.click();
    });