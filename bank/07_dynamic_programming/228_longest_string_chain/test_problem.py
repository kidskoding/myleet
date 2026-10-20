from solution import longest_str_chain


def test_longest_str_chain_example():
    assert longest_str_chain(["a", "b", "ba", "bca", "bda", "bdca"]) == 4


def test_longest_str_chain_insertions_anywhere():
    assert longest_str_chain(["xbc", "pcxbcf", "xb", "cxbc", "pcxbc"]) == 5


def test_longest_str_chain_no_links():
    assert longest_str_chain(["abcd", "dbqca"]) == 1


def test_longest_str_chain_single():
    assert longest_str_chain(["a"]) == 1


def test_longest_str_chain_branching():
    assert longest_str_chain(["a", "ab", "ac", "abc", "bd"]) == 3
