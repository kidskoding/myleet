from solution import TinyURLCodec


def test_tiny_url_codec_round_trips():
    codec = TinyURLCodec()
    url = "https://leetcode.com/problems/design-tinyurl"

    assert codec.decode(codec.encode(url)) == url


def test_tiny_url_codec_is_stable_for_the_same_url():
    codec = TinyURLCodec()
    url = "http://example.com"

    assert codec.encode(url) == codec.encode(url)


def test_tiny_url_codec_gives_distinct_codes():
    codec = TinyURLCodec()
    first = codec.encode("http://a.com")
    second = codec.encode("http://b.com")

    assert first != second
    assert codec.decode(first) == "http://a.com"
    assert codec.decode(second) == "http://b.com"
