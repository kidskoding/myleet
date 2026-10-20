from solution import find_anagrams


def test_find_anagrams_normal():
    assert find_anagrams("cbaebabacd", "abc") == [0, 6]


def test_find_anagrams_no_match():
    assert find_anagrams("abc", "xyz") == []


def test_find_anagrams_p_longer_than_s():
    assert find_anagrams("a", "ab") == []


def test_find_anagrams_full_match():
    assert find_anagrams("ab", "ab") == [0]
