'use strict';

const util = require('util');
const https = require('https');
const url = require('url');
const fs = require('fs');
const config = require('config');
const cron = require('node-cron');

const jmaparser = require('./jmaparser');

const xmlparseAsync = util.promisify(require('xml2js').parseString);
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

const stateCacheFile = './state.json';

const slackInfo = config.Slack;

console.log('Slack notify: ' + slackInfo.notify.webhook);
console.log('Slack error : ' + slackInfo.error.webhook);

cron.schedule('21 * * * * *', async () =>{await fetchFeedAsync()});

async function fetchFeedAsync() {
	let lastModified,currentLastEntries;
	
	try{
		const currentStateJSON = await readFileAsync(stateCacheFile,'utf-8');
		
		const currentState = await JSON.parse(currentStateJSON);
		
		lastModified = new Date(currentState.lastModified);
		currentLastEntries = currentState.entry;
		
	}catch(e){
		console.log("STATE:" + e);
	}
	
	let data,body;
	try{
		const result = await httpsGetAsync('https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml', lastModified);
		if(result.data === null){
			// no data.
			return;
		}
		data = result.data;
		body = result.body;
		lastModified = result.lastModified;
	}catch(e){
		console.log("HTTP:" + e);
		return;
	}
	
	console.log((new Date()).toString() + ": FeedLastModified: " + lastModified.toString());
	
	let newLastEntries;
	try{
		newLastEntries = filterFeedEntries(data,currentLastEntries);
	}catch(e){
		console.error("FEED:" + e);
		await writeFileAsync('parseError.'+Date.now()+'.xml', body);
		return;
	}
	
	const json = JSON.stringify({"entry":newLastEntries,"lastModified":lastModified});
	
	try{
		await writeFileAsync(stateCacheFile,json);
	}catch(e){
		console.log(e);
	}
	
	console.log((new Date()).toString() + ": BEGIN");
	await jmaparser.processEntriesAsync(data.feed.entry, slackInfo);
	console.log((new Date()).toString() + ": END");
	
}

function filterFeedEntries(data, currentLastEntries) {
	let newLastEntries = {};
	let filteredEntries = [];
	
	for(let entry of data.feed.entry.reverse()){
		const href = entry.link.$.href;
		
		newLastEntries[href] = 1;
		if(currentLastEntries != null && !(href in currentLastEntries)){
			filteredEntries.push(entry);
		}
	}
	
	data.feed.entry = filteredEntries;
	return newLastEntries;
}

function httpsGetAsync(uri,ifModifiedSince) {
	return new Promise((resolve, reject) => {
		const options = url.parse(uri);
		
		if(ifModifiedSince != null){
			options.headers = {
				'if-modified-since': ifModifiedSince.toUTCString(),
			};
		}
		options.method='GET';
		
		const req = https.request(options,(res) => {
			
			if(res.statusCode == 304){
				resolve({
					'lastModified' : ifModifiedSince,
					'data' : null,
					'body' : null
				});
				return;
				
			}else if(res.statusCode != 200){
			
				reject(new Error('statusCode=' + res.statusCode));
				return;
				
			}
			
			let body = '';
			res.setEncoding('utf8');
			res.on('data', (chunk) => {
				body += chunk;
			});
			
			res.on('end', async () => {
				try{
					const obj = await xmlparseAsync(body, {trim: true, explicitArray: false} );
					resolve({
						'lastModified' : new Date(res.headers['last-modified']),
						'data' : obj,
						'body': body
					});
				}catch(error){
					try{
						await writeFileAsync('xmlError.'+Date.now()+'.xml', body);
					}catch(e){
						console.log("Cannot save Error XML" + e);
					}
					reject(error);
				}
			});
		}).on('error',(error) => {
			reject(error);
		});
		
		req.end();
	});
}

