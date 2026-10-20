from solution import find_substring


def test_find_substring_normal():
    assert find_substring("barfoothefoobarman", ["foo", "bar"]) == [0, 9]


def test_find_substring_no_match():
    words = ["word", "good", "best", "word"]
    assert find_substring("wordgoodgoodgoodbestword", words) == []
