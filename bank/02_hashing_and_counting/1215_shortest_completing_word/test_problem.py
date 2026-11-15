from solution import shortest_completing_word


def test_shortest_completing_word_example_one():
    assert shortest_completing_word("1s3 PSt", ["step", "steps", "stripe", "stepple"]) == "steps"


def test_shortest_completing_word_example_two():
    assert shortest_completing_word("1s3 456", ["looks", "pest", "stew", "show"]) == "pest"


def test_shortest_completing_word_tie_keeps_first():
    assert shortest_completing_word("aB", ["bad", "abc", "ba"]) == "ba"


def test_shortest_completing_word_repeated_letters():
    assert shortest_completing_word("OO 7", ["foo", "of", "zoo"]) == "foo"


def test_shortest_completing_word_first_of_equal_length():
    assert shortest_completing_word("ab", ["cab", "abd", "ab"]) == "ab"
