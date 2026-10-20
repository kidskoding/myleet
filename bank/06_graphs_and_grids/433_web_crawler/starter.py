from typing import Protocol


class HtmlParser(Protocol):
    def get_urls(self, url: str) -> list[str]: ...


def crawl(start_url: str, html_parser: HtmlParser) -> list[str]:
    # Problem 433: Web Crawler

    # Time:
    # Space:

    raise NotImplementedError
