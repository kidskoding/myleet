from solution import group_anagrams


def test_group_anagrams_normal():
    result = group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
    normalized = sorted(sorted(group) for group in result)
    expected = sorted(sorted(group) for group in [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]])
    assert normalized == expected


def test_group_anagrams_empty():
    assert group_anagrams([]) == []


def test_group_anagrams_single_word():
    assert group_anagrams(["abc"]) == [["abc"]]


def test_group_anagrams_empty_string():
    assert group_anagrams([""]) == [[""]]


def test_group_anagrams_identical_words_group_together():
    assert group_anagrams(["a", "a"]) == [["a", "a"]]


def test_group_anagrams_same_letters_different_lengths_do_not_group():
    result = group_anagrams(["ab", "aab"])
    normalized = sorted(sorted(group) for group in result)

    assert normalized == [["aab"], ["ab"]]
