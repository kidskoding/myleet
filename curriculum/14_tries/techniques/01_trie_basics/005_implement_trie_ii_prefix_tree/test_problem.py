from solution import TrieII


def test_trie_ii_counts_duplicates():
    trie = TrieII()
    trie.insert("apple")
    trie.insert("apple")

    assert trie.count_words_equal_to("apple") == 2
    assert trie.count_words_starting_with("app") == 2


def test_trie_ii_erase_decrements():
    trie = TrieII()
    trie.insert("apple")
    trie.insert("apple")
    trie.erase("apple")

    assert trie.count_words_equal_to("apple") == 1
    assert trie.count_words_starting_with("app") == 1


def test_trie_ii_erase_to_empty():
    trie = TrieII()
    trie.insert("apple")
    trie.erase("apple")

    assert trie.count_words_starting_with("app") == 0
