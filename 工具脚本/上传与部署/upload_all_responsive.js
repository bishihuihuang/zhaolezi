const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = 'process.env.GITHUB_TOKEN || "TOKEN_REMOVED_FOR_SAFETY"';
const OWNER = 'bishihuihuang';
const REPO = 'zhaolezi';
const BRANCH = 'main';

// 涓婁紶鎵€鏈塇TML鏂囦欢
const FILES = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.html'))
    .sort();

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
                        reject(new Error(`API ${method} ${apiPath}: ${res.statusCode} - ${json.message || data.substring(0, 200)}`));
                    }
                } catch (e) {
                    reject(new Error(`Parse: ${e.message}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    console.log(`========== 鎵归噺涓婁紶 ${FILES.length} 涓枃浠?==========\n`);
    
    // 1. 鑾峰彇鏈€鏂癱ommit
    console.log('1. 鑾峰彇鏈€鏂癱ommit...');
    const ref = await apiRequest('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
    const latestSha = ref.object.sha;
    console.log(`   SHA: ${latestSha}`);
    
    // 2. 鑾峰彇base tree
    const commit = await apiRequest('GET', `/repos/${OWNER}/${REPO}/git/commits/${latestSha}`);
    const baseTree = commit.tree.sha;
    
    // 3. 璇诲彇鎵€鏈夋枃浠?    console.log('\n2. 璇诲彇鏂囦欢...');
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
            console.log(`   ${file}: ${(fs.statSync(filePath).size/1024).toFixed(1)}KB`);
        }
    }
    
    // 4. 鍒涘缓tree
    console.log('\n3. 鍒涘缓tree...');
    const newTree = await apiRequest('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
        base_tree: baseTree,
        tree: treeItems
    });
    console.log(`   tree: ${newTree.sha}`);
    
    // 5. 鍒涘缓commit
    console.log('\n4. 鍒涘缓commit...');
    const newCommit = await apiRequest('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
        message: 'Responsive design update: touch optimization, safe area, dark mode, mobile breakpoints, 44px touch targets',
        tree: newTree.sha,
        parents: [latestSha]
    });
    console.log(`   commit: ${newCommit.sha}`);
    
    // 6. 鏇存柊鍒嗘敮
    console.log('\n5. 鏇存柊鍒嗘敮...');
    await apiRequest('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
        sha: newCommit.sha,
        force: false
    });
    
    console.log(`\n========== 涓婁紶鎴愬姛锛?==========`);
    console.log(`commit: ${newCommit.sha}`);
    console.log(`涓婁紶 ${FILES.length} 涓枃浠禶);
    console.log(`GitHub Pages灏嗗湪1-2鍒嗛挓鍐呮瀯寤恒€俙);
}

main().catch(e => { console.error('澶辫触:', e.message); process.exit(1); });

