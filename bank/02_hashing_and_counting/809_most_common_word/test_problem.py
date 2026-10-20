from solution import most_common_word


def test_most_common_word_skips_banned():
    assert most_common_word("Bob hit a ball, the hit BALL flew far after it was hit.", ["hit"]) == "ball"


def test_most_common_word_single_word():
    assert most_common_word("a.", []) == "a"


def test_most_common_word_punctuation_without_spaces():
    assert most_common_word("a, a, a, a, b,b,b,c, c", ["a"]) == "b"


def test_most_common_word_case_insensitive():
    assert most_common_word("Dog dog DOG cat", []) == "dog"


def test_most_common_word_several_banned():
    assert most_common_word("x y y z z z", ["z", "y"]) == "x"
