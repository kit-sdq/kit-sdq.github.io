function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true);
    xmlHttp.send(null);
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
	});
	sortTable(repoListHtml);
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
	domElement.textContent = 'n/a';
	httpGetAsync('https://raw.githubusercontent.com/' + fullRepoName + '/master/.github/CODEOWNERS', response => {setCodeOwnerInDom(domElement, determineCodeOwner(response))});
	httpGetAsync('https://raw.githubusercontent.com/' + fullRepoName + '/master/docs/CODEOWNERS', response => {setCodeOwnerInDom(domElement, determineCodeOwner(response))});
}

function setCodeOwnerInDom(domElement, codeOwners) {
	if (codeOwners.length > 0) {
		domElement.textContent = '';
		codeOwners.map(generateOwnerLink).forEach(ownerElement => {domElement.appendChild(ownerElement)});
	}
}

function generateOwnerLink(username) {
	var nameElement = document.createElement('a');
	nameElement.textContent = username
	nameElement.setAttribute('href', '#');
	
	httpGetAsync('https://api.github.com/users/' + username, response => {
		var user = JSON.parse(response);
		nameElement.textContent = user['name'] + ' (@' + user['login'] + ')';
		nameElement.setAttribute('href', user['html_url']);
	});
	
	return nameElement
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
	httpGetAsync('https://api.github.com/orgs/kit-sdq/repos', response => fillTable(domId, response))
}