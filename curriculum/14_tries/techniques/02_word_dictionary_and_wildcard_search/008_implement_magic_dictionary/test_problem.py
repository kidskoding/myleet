from solution import MagicDictionary


def test_magic_dictionary_one_character_swap():
    magic_dictionary = MagicDictionary()
    magic_dictionary.build_dict(["hello", "leetcode"])

    assert magic_dictionary.search("hello") is False
    assert magic_dictionary.search("hhllo") is True
    assert magic_dictionary.search("hell") is False
    assert magic_dictionary.search("leetcoded") is False


def test_magic_dictionary_empty_dictionary():
    magic_dictionary = MagicDictionary()
    magic_dictionary.build_dict([])
    assert magic_dictionary.search("hello") is False
