from solution import Trie


def test_trie_insert_and_search():
    trie = Trie()
    trie.insert("apple")
    assert trie.search("apple") is True
    assert trie.search("app") is False
    assert trie.starts_with("app") is True


def test_trie_search_empty_trie():
    trie = Trie()
    assert trie.search("anything") is False
    assert trie.starts_with("a") is False


def test_trie_multiple_words_share_prefix():
    trie = Trie()
    trie.insert("car")
    trie.insert("cat")
    assert trie.search("car") is True
    assert trie.search("cat") is True
    assert trie.search("ca") is False
    assert trie.starts_with("ca") is True
    assert trie.starts_with("ca t") is False
