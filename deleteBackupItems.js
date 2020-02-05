const ishayPosts = require('./facebookBackupExampleUnpacked/posts/your_posts_1.html')


function run(){
    console.log('this is from now ishayPosts2:', typeof ishayPosts);
    // const links = extractPostLinks(ishayPosts)
    // console.log('!@# lidnks:', JSON.stringify( links));
}

function extractPostLinks(postsHtml) { 
    const postLinkRegex = /(?<postLink>facebook.com\/dyi\/.+?)"/g;
    // console.log('!@#@@ postHtml:', postsHtml);
	const links = [...postsHtml.matchAll(postLinkRegex)].map(m => m.groups.postLink);
    return links;
    // return ['k']
}

module.exports = {
    run
}


// function deleteFacebookItems(backupItems) {
// 	var deletionStage = 0;

// 	function waitForStoryOptions() {
// 		const storyOptions = document.querySelector('[aria-label="Story options"]');
// 		if (storyOptions && deletionStage === 0) {
// 			storyOptions.click();
// 			deletionStage++;
// 		}
// 	}

// 	function waitForDeleteMenuItem() {
// 		const deleteMenuItem = document.querySelector('[role="menuitem"][ajaxify*="delete"]');
// 		if (deleteMenuItem && deletionStage === 1) {
// 			deleteMenuItem.click();
// 			deletionStage++;
// 		}
// 	}

// 	function waitForConfirmDelete() {
// 		const confirmDelete = document.querySelector('[data-testid*="delete"][type="submit"]');
// 		if (confirmDelete && deletionStage === 2) {
// 			confirmDelete.click();
// 			deletionStage++;
// 		}
// 	}

// 	function deleteItem() {
// 		setInterval(waitForConfirmDelete, 100);
// 		setInterval(waitForDeleteMenuItem, 100);
// 		setInterval(waitForStoryOptions, 100);
// 	}

// 	deleteItem();
// }
