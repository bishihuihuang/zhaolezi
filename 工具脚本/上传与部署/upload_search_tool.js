const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = 'process.env.GITHUB_TOKEN || "TOKEN_REMOVED_FOR_SAFETY"';
const OWNER = 'bishihuihuang';
const REPO = 'zhaolezi';
const BRANCH = 'main';

const FILES = [
    { local: '鏂囦欢鎼滅储.html', remote: '鏂囦欢鎼滅储.html' },
    { local: '30.html', remote: '30.html' },
    { local: '_鍘熷鏈贩娣嗙増/30.html', remote: '_鍘熷鏈贩娣嗙増/30.html' }
];

function apiRequest(method, apiPath, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: apiPath,
            method: method,
            headers: {
                'User-Agent': 'git',
                'Authorization': `token ${TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        reject(new Error(`API ${method} ${apiPath} failed: ${res.statusCode} - ${json.message || data.substring(0, 300)}`));
                    }
                } catch (e) {
                    reject(new Error(`Parse error: ${e.message}, data: ${data.substring(0, 300)}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    try {
        console.log('========== 涓婁紶鏂囦欢鎼滅储宸ュ叿 + 鏇存柊30.html鍏憡 ==========\n');

        console.log('1. 鑾峰彇杩滅▼main鍒嗘敮鏈€鏂癱ommit...');
        const ref = await apiRequest('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
        const latestCommitSha = ref.object.sha;
        console.log(`   鏈€鏂癱ommit SHA: ${latestCommitSha}`);

        console.log('\n2. 鑾峰彇鏈€鏂癱ommit鐨則ree...');
        const commit = await apiRequest('GET', `/repos/${OWNER}/${REPO}/git/commits/${latestCommitSha}`);
        const baseTreeSha = commit.tree.sha;
        console.log(`   base tree SHA: ${baseTreeSha}`);

        console.log('\n3. 璇诲彇鏈湴鏂囦欢骞跺噯澶噒ree...');
        const treeItems = [];
        for (const f of FILES) {
            const filePath = path.join(__dirname, f.local);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                treeItems.push({
                    path: f.remote,
                    mode: '100644',
                    type: 'blob',
                    content: content
                });
                console.log(`   ${f.remote}: ${content.length} 瀛楃`);
            } else {
                console.log(`   ${f.local}: 鏂囦欢涓嶅瓨鍦紝璺宠繃`);
            }
        }

        console.log('\n4. 鍒涘缓鏂扮殑tree...');
        const newTree = await apiRequest('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
            base_tree: baseTreeSha,
            tree: treeItems
        });
        console.log(`   鏂皌ree SHA: ${newTree.sha}`);

        console.log('\n5. 鍒涘缓鏂扮殑commit...');
        const newCommit = await apiRequest('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
            message: '鏂板鏂囦欢鎼滅储宸ュ叿锛屾洿鏂?0.html鍏憡锛?026-09-05锛?,
            tree: newTree.sha,
            parents: [latestCommitSha]
        });
        console.log(`   鏂癱ommit SHA: ${newCommit.sha}`);

        console.log('\n6. 鏇存柊main鍒嗘敮寮曠敤...');
        const updatedRef = await apiRequest('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
            sha: newCommit.sha,
            force: false
        });
        console.log(`   鍒嗘敮宸叉洿鏂? ${updatedRef.object.sha}`);

        console.log('\n========== 涓婁紶鎴愬姛锛?==========');
        console.log(`鏂癱ommit: ${newCommit.sha}`);
        console.log(`鎻愪氦淇℃伅: ${newCommit.message}`);
        console.log('\n涓婁紶鍐呭:');
        console.log('  - 鏂囦欢鎼滅储.html锛堟柊澧炴枃浠跺す妯＄硦鎼滅储宸ュ叿锛?);
        console.log('  - 30.html锛堟坊鍔?026-09-05鏇存柊鍏憡锛?);
        console.log('  - _鍘熷鏈贩娣嗙増/30.html锛堝悓姝ユ洿鏂板叕鍛婏級');
        console.log('\nGitHub Pages灏嗗湪1-2鍒嗛挓鍐呴噸鏂版瀯寤恒€?);

    } catch (error) {
        console.error('\n========== 涓婁紶澶辫触 ==========');
        console.error(`閿欒: ${error.message}`);
        process.exit(1);
    }
}

main();

