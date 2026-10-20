from solution import crawl


class FakeParser:
    def __init__(self, links: dict[str, list[str]]) -> None:
        self.links = links
        self.calls: list[str] = []

    def get_urls(self, url: str) -> list[str]:
        self.calls.append(url)
        return self.links.get(url, [])


LINKS = {
    "http://news.yahoo.com/news/topics/": ["http://news.yahoo.com/news", "http://news.yahoo.com"],
    "http://news.yahoo.com/news": ["http://news.google.com"],
    "http://news.yahoo.com": ["http://news.yahoo.com/us", "http://news.yahoo.com/news/topics/"],
    "http://news.google.com": ["http://news.yahoo.com/news"],
    "http://news.yahoo.com/us": [],
}


def test_crawl_same_host_only():
    result = crawl("http://news.yahoo.com/news/topics/", FakeParser(LINKS))
    assert sorted(result) == sorted(
        [
            "http://news.yahoo.com",
            "http://news.yahoo.com/news",
            "http://news.yahoo.com/news/topics/",
            "http://news.yahoo.com/us",
        ]
    )


def test_crawl_start_on_other_host():
    assert sorted(crawl("http://news.google.com", FakeParser(LINKS))) == ["http://news.google.com"]


def test_crawl_isolated_page():
    assert crawl("http://a.com", FakeParser({})) == ["http://a.com"]


def test_crawl_cycle_visits_each_once():
    links = {"http://a.com/1": ["http://a.com/2"], "http://a.com/2": ["http://a.com/1", "http://a.com/2"]}
    parser = FakeParser(links)
    assert sorted(crawl("http://a.com/1", parser)) == ["http://a.com/1", "http://a.com/2"]
    assert sorted(parser.calls) == ["http://a.com/1", "http://a.com/2"]


def test_crawl_subdomain_is_different_host():
    links = {"http://a.com": ["http://b.a.com", "http://a.com/x"], "http://a.com/x": ["http://a.co"]}
    assert sorted(crawl("http://a.com", FakeParser(links))) == ["http://a.com", "http://a.com/x"]
