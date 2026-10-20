from solution import word_squares


def test_word_squares_two_solutions():
    result = word_squares(["area", "lead", "wall", "lady", "ball"])

    assert sorted(sorted(square) for square in result) == [
        sorted(["ball", "area", "lead", "lady"]),
        sorted(["wall", "area", "lead", "lady"]),
    ]


def test_word_squares_repeated_words():
    result = word_squares(["abat", "baba", "atan", "atal"])

    assert sorted(sorted(square) for square in result) == [
        sorted(["baba", "abat", "baba", "atal"]),
        sorted(["baba", "abat", "baba", "atan"]),
    ]
