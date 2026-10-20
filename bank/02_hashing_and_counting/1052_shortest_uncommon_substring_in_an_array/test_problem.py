from solution import shortest_substrings


def test_shortest_substrings_example_one():
    assert shortest_substrings(["cab", "ad", "bad", "c"]) == ["ab", "", "ba", ""]


def test_shortest_substrings_example_two():
    assert shortest_substrings(["abc", "bcd", "abcd"]) == ["", "", "abcd"]


def test_shortest_substrings_single_letters():
    assert shortest_substrings(["a", "b"]) == ["a", "b"]


def test_shortest_substrings_duplicates():
    assert shortest_substrings(["aa", "aa"]) == ["", ""]


def test_shortest_substrings_lexicographic_pick():
    assert shortest_substrings(["zyx", "abc"]) == ["x", "a"]
