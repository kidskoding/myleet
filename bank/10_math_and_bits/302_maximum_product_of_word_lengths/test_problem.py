from solution import max_product


def test_max_product_example():
    assert max_product(["abcw", "baz", "foo", "bar", "xtfn", "abcdef"]) == 16


def test_max_product_short_words():
    assert max_product(["a", "ab", "abc", "d", "cd", "bcd", "abcd"]) == 4


def test_max_product_all_overlap():
    assert max_product(["a", "aa", "aaa", "aaaa"]) == 0


def test_max_product_two_disjoint():
    assert max_product(["ab", "cd"]) == 4


def test_max_product_duplicate_words():
    assert max_product(["ab", "ab"]) == 0


def test_max_product_repeated_letters_count_in_length():
    assert max_product(["aaaa", "bb", "abc"]) == 8
