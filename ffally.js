const fetchOpts = {
    method: 'HEAD',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        'Accept': 'application/json',
    }
};

const proms = {};
const repoScore = (owner, repo) => {
    const links =
        [[`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/CODE_OF_CONDUCT.md`, ' 🏳️‍🌈'],
        [`https://github.com/${owner}/${repo}/tree/main`, ' ✅']];
    const key = `${owner}/${repo}`;
    proms[key] ??= (async () => {
        let { res = '', date = 0 } = await browser.storage.local.get(key)
            .then(x => x?.[key] || ({}))
            .catch((e) => ({}));
        const dateNow = new Date().valueOf();
        if (dateNow - date < 7 * 24 * 60 * 60 * 1000) return res;
        for (const [link, emoji] of links) {
            const ok = await fetch(link, fetchOpts)
                .then((x) => x.status === 200)
                .catch(() => false);
            if (ok) {
                res = emoji;
                break;
            }
        }
        await browser.storage.local.set({ [key]: { res, date: dateNow } });
        return res;
    })();
    return proms[key];
};

const urlScore = async (elem) => {
    const { textContent, href } = elem;
    url = new URL(href, document.location).href;
    const match = /^https?:\/\/github.com\/([^\/]+)\/([^#?\/]+)(\/.*$|$)/.exec(url);
    if (!match) return '';
    const [, owner, repo, rest] = match;
    return rest && textContent !== repo ? '' : await repoScore(owner, repo);
}

const tagUrls = async () => {
    const links = document.querySelectorAll('a');
    for (const link of links) {
        const score = await urlScore(link);
        if (!link.textContent.endsWith(score)) {
            link.textContent += score;
        }
    }
};

(async () => {
    let timeout = setTimeout(tagUrls, 300);
    const observer = new MutationObserver(async () => {
        clearTimeout(timeout);
        timeout = setTimeout(tagUrls, 300);
    });
    observer.observe(document.body, { childList: true, attributes: true, subtree: true });
})();
