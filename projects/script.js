const reposWithoutOwners = ['updatesite'];
const discontinuedTag = 'discontinued';
const archivedTag = 'archived';

function httpGetAsync(theUrl, callback, githubPreviewHeader = false)
{
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
			callback(xmlHttp.responseText);
			const linkHeader = xmlHttp.getResponseHeader('link');
			if (linkHeader != null) {
				const nextUrlRegex = /<([^>]+)>; rel="next"/gm;
				const matches = findAllMatches(nextUrlRegex, linkHeader, 1);
				if (matches.length == 1) {
					httpGetAsync(matches[0], callback, githubPreviewHeader);
				}
			}
		}
	}
	xmlHttp.open("GET", theUrl, true);
	if (theUrl.includes('https://api.github.com')) {
		//xmlHttp.setRequestHeader('Authorization', 'token OAUTHTOKEN');
	}

	if (githubPreviewHeader) {
		xmlHttp.setRequestHeader('Accept', 'application/vnd.github.mercy-preview+json');
	}
	xmlHttp.send(null);
}

function httpGetAsyncPreview(theUrl, callback) {
	httpGetAsync(theUrl, callback, true);
}

function fillTable(domId, responseText) {
	const repos = JSON.parse(responseText)
	const repoListHtml = document.getElementById(domId);
	repos.forEach(repo => {
		var rowHtml = document.createElement('tr');
		repoListHtml.appendChild(rowHtml);
		var nameCellHtml = document.createElement('td');
		rowHtml.appendChild(nameCellHtml);
		var nameLinkHtml = document.createElement('a');
		nameLinkHtml.setAttribute('href', repo['html_url']);
		nameLinkHtml.textContent = repo['name'];
		nameCellHtml.appendChild(nameLinkHtml);
		var ownerCellHtml = document.createElement('td');
		rowHtml.appendChild(ownerCellHtml);
		setCodeOwner(ownerCellHtml, repo['full_name']);
		var topicCellHtml = document.createElement('td');
		rowHtml.appendChild(topicCellHtml);
		var topics = repo['topics']
		if (repo['archived']) {
			topics.push('archived')
		}
		setTopics(topics, topicCellHtml, nameLinkHtml, ownerCellHtml);
	});
	sortTable(repoListHtml);
}

function setTopics(topics, domElement, domElementRepoName, docElementOwnerName) {
	domElement.textContent = topics.join(', ');
	if (topics.includes(discontinuedTag) || topics.includes(archivedTag)) {
		domElementRepoName.style.textDecoration = "line-through";
		// Remove n/a for discontinued projects without an owner
		if (docElementOwnerName.textContent == 'n/a') {
			docElementOwnerName.textContent = '';
		}
		docElementOwnerName.style.textDecoration = "line-through";
	}
}

function sortTable(trHoldingElement) {
	const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;
	const comparer = (idx, asc) => (a, b) => ((v1, v2) => 
		v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
		)(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));
	Array.from(trHoldingElement.querySelectorAll('tr'))
        .sort(comparer(0, true))
        .forEach(tr => trHoldingElement.appendChild(tr) );
}

function setCodeOwner(domElement, fullRepoName) {
	const repoWithoutOrganization = fullRepoName.split('/')[1];
	if (!reposWithoutOwners.includes(repoWithoutOrganization)) {
		domElement.textContent = 'n/a';
		httpGetAsync('https://raw.githubusercontent.com/' + fullRepoName + '/master/.github/CODEOWNERS', response => {setCodeOwnerInDom(domElement, determineCodeOwner(response))});
		httpGetAsync('https://raw.githubusercontent.com/' + fullRepoName + '/master/docs/CODEOWNERS', response => {setCodeOwnerInDom(domElement, determineCodeOwner(response))});
	}
}

function setCodeOwnerInDom(domElement, codeOwners) {
	if (codeOwners.length > 0) {
		domElement.textContent = '';
		codeOwners.map(generateOwnerLink).forEach(ownerElement => {domElement.appendChild(ownerElement)});
	}
}

function generateOwnerLink(username) {
	var divElement = document.createElement('div');
	var nameElement = document.createElement('a');
	divElement.appendChild(nameElement);
	nameElement.textContent = '@' + username
	nameElement.setAttribute('href', '#');
	
	httpGetAsync('https://api.github.com/users/' + username, response => {
		const user = JSON.parse(response);
		if (user['name']) {
			nameElement.textContent = user['name'] + ' (@' + user['login'] + ')';
		}
		nameElement.setAttribute('href', user['html_url']);
	});
	
	return divElement;
}

function determineCodeOwner(codeOwnersFileContent) {
	var codeOwners = [];
	const relevantLinesRegex = /^\*\s+(.*)/g;
	var codeOwnerLines = findAllMatches(relevantLinesRegex, codeOwnersFileContent, 1);
	codeOwnerLines.forEach(line => {
		const codeOwnerRegex = /@(\S+)/g;
		let codeOwnersOfLine = findAllMatches(codeOwnerRegex, line, 1);
		codeOwners = codeOwners.concat(codeOwnersOfLine);
	});
	return codeOwners;
}

function findAllMatches(regex, str, groupIndex) {
	var results = [];
	let m;
	while ((m = regex.exec(str)) !== null) {
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}
		
		m.forEach((match, gi) => {
			if (gi == groupIndex) {
				results.push(match);
			}
		});
	}
	return results
}

function fillTableForOrganisation(org, domId) {
	httpGetAsyncPreview('https://api.github.com/orgs/' + org + '/repos', response => fillTable(domId, response))
}