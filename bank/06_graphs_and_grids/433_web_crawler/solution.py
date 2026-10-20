from collections import deque
from typing import Protocol


class HtmlParser(Protocol):
    def get_urls(self, url: str) -> list[str]: ...


def crawl(start_url: str, html_parser: HtmlParser) -> list[str]:
    # Time: O(V + E) parser calls and link checks.
    # Space: O(V).
    def host(url: str) -> str:
        return url.split("/")[2]

    target = host(start_url)
    seen = {start_url}
    queue = deque([start_url])
    while queue:
        url = queue.popleft()
        for nxt in html_parser.get_urls(url):
            if nxt not in seen and host(nxt) == target:
                seen.add(nxt)
                queue.append(nxt)
    return list(seen)
