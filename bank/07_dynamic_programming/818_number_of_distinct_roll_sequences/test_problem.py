from solution import distinct_sequences


def test_distinct_sequences_example_four_rolls():
    assert distinct_sequences(4) == 184


def test_distinct_sequences_example_two_rolls():
    assert distinct_sequences(2) == 22


def test_distinct_sequences_single_roll():
    assert distinct_sequences(1) == 6


def test_distinct_sequences_three_rolls():
    assert distinct_sequences(3) == 66


def test_distinct_sequences_five_rolls():
    assert distinct_sequences(5) == 516
