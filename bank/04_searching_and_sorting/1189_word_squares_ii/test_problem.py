from solution import word_squares


def test_word_squares_two_squares():
    assert word_squares(["able", "area", "echo", "also"]) == [
        ["able", "area", "echo", "also"],
        ["area", "able", "also", "echo"],
    ]


def test_word_squares_none():
    assert word_squares(["code", "cafe", "eden", "edge"]) == []


def test_word_squares_distractor_ignored():
    assert word_squares(["zzzz", "also", "echo", "area", "able"]) == [
        ["able", "area", "echo", "also"],
        ["area", "able", "also", "echo"],
    ]


def test_word_squares_every_arrangement_valid():
    result = word_squares(["aaaa", "abba", "acca", "adda"])
    assert len(result) == 24
    assert result[0] == ["aaaa", "abba", "acca", "adda"]
    assert result[-1] == ["adda", "acca", "abba", "aaaa"]


def test_word_squares_letters_mismatch():
    assert word_squares(["aaaa", "aaab", "baaa", "bbbb"]) == []
