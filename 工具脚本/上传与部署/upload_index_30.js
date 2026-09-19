const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = 'process.env.GITHUB_TOKEN || "TOKEN_REMOVED_FOR_SAFETY"';
const OWNER = 'bishihuihuang';
const REPO = 'zhaolezi';
const BRANCH = 'main';

// 鍙笂浼犺繖涓や釜鏂囦欢
const FILES = ['index.html', '30.html'];

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
                        reject(new Error(`API ${method} ${apiPath} failed: ${res.statusCode} - ${json.message || data.substring(0, 200)}`));
                    }
                } catch (e) {
                    reject(new Error(`Parse error: ${e.message}, data: ${data.substring(0, 200)}`));
                }
            });
        });
        
        req.on('error', reject);
        
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function main() {
    try {
        console.log('========== 浣跨敤GitHub API涓婁紶 index.html 鍜?30.html ==========\n');
        
        // 1. 鑾峰彇褰撳墠鍒嗘敮鐨勬渶鏂癱ommit
        console.log('1. 鑾峰彇杩滅▼main鍒嗘敮鏈€鏂癱ommit...');
        const ref = await apiRequest('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
        const latestCommitSha = ref.object.sha;
        console.log(`   鏈€鏂癱ommit SHA: ${latestCommitSha}`);
        
        // 2. 鑾峰彇璇ommit鐨則ree
        console.log('\n2. 鑾峰彇鏈€鏂癱ommit鐨則ree...');
        const commit = await apiRequest('GET', `/repos/${OWNER}/${REPO}/git/commits/${latestCommitSha}`);
        const baseTreeSha = commit.tree.sha;
        console.log(`   base tree SHA: ${baseTreeSha}`);
        
        // 3. 璇诲彇鏈湴鏂囦欢骞跺垱寤簍ree items
        console.log('\n3. 璇诲彇鏈湴鏂囦欢骞跺噯澶噒ree...');
        const treeItems = [];
        for (const file of FILES) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                treeItems.push({
                    path: file,
                    mode: '100644',
                    type: 'blob',
                    content: content
                });
                console.log(`   ${file}: ${content.length} 瀛楃`);
            } else {
                console.log(`   ${file}: 鏂囦欢涓嶅瓨鍦紝璺宠繃`);
            }
        }
        
        // 4. 鍒涘缓鏂扮殑tree
        console.log('\n4. 鍒涘缓鏂扮殑tree...');
        const newTree = await apiRequest('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
            base_tree: baseTreeSha,
            tree: treeItems
        });
        console.log(`   鏂皌ree SHA: ${newTree.sha}`);
        
        // 5. 鍒涘缓鏂扮殑commit
        console.log('\n5. 鍒涘缓鏂扮殑commit...');
        const newCommit = await apiRequest('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
            message: 'Update index.html and add 30.html (update announcement page with mobile optimization, 30.html unobfuscated for easy editing)',
            tree: newTree.sha,
            parents: [latestCommitSha]
        });
        console.log(`   鏂癱ommit SHA: ${newCommit.sha}`);
        
        // 6. 鏇存柊鍒嗘敮寮曠敤
        console.log('\n6. 鏇存柊main鍒嗘敮寮曠敤...');
        const updatedRef = await apiRequest('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
            sha: newCommit.sha,
            force: false
        });
        console.log(`   鍒嗘敮宸叉洿鏂? ${updatedRef.object.sha}`);
        
        console.log('\n========== 涓婁紶鎴愬姛锛?==========');
        console.log(`鏂癱ommit: ${newCommit.sha}`);
        console.log(`鎻愪氦淇℃伅: ${newCommit.message}`);
        console.log(`\n涓婁紶鐨勬枃浠?`);
        FILES.forEach(f => console.log(`  - ${f}`));
        console.log(`\nGitHub Pages灏嗗湪1-2鍒嗛挓鍐呴噸鏂版瀯寤恒€俙);
        console.log(`30.html淇濇寔鏈贩娣嗙姸鎬侊紝鏂逛究鍚庣画缁忓父淇敼銆俙);
        
    } catch (error) {
        console.error('\n========== 涓婁紶澶辫触 ==========');
        console.error(`閿欒: ${error.message}`);
        process.exit(1);
    }
}

main();

