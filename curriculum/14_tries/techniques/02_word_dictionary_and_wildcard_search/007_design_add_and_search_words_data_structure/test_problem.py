from solution import WordDictionary


def test_word_dictionary_exact_and_wildcard_search():
    word_dictionary = WordDictionary()
    word_dictionary.add_word("bad")
    word_dictionary.add_word("dad")
    word_dictionary.add_word("mad")

    assert word_dictionary.search("pad") is False
    assert word_dictionary.search("bad") is True
    assert word_dictionary.search(".ad") is True
    assert word_dictionary.search("b..") is True


def test_word_dictionary_search_empty():
    word_dictionary = WordDictionary()
    assert word_dictionary.search("a") is False


def test_word_dictionary_all_wildcards():
    word_dictionary = WordDictionary()
    word_dictionary.add_word("ab")
    assert word_dictionary.search("..") is True
    assert word_dictionary.search("...") is False
