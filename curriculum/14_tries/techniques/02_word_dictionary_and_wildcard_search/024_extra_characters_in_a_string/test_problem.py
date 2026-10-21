from solution import min_extra_char


def test_min_extra_char_normal():
    assert min_extra_char("leetscode", ["leet", "code", "leetcode"]) == 1


def test_min_extra_char_all_covered():
    assert min_extra_char("sayhelloworld", ["hello", "world"]) == 3


def test_min_extra_char_no_dictionary_hits():
    assert min_extra_char("abc", ["xyz"]) == 3


def test_min_extra_char_full_cover():
    assert min_extra_char("abcdef", ["abc", "def"]) == 0


def test_min_extra_char_overlapping_choices():
    assert min_extra_char("aaaa", ["a", "aa", "aaa"]) == 0
