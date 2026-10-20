from solution import find_the_winner


def test_find_the_winner_example_one():
    assert find_the_winner(5, 2) == 3


def test_find_the_winner_example_two():
    assert find_the_winner(6, 5) == 1


def test_find_the_winner_single_friend():
    assert find_the_winner(1, 1) == 1


def test_find_the_winner_k_one_last_survives():
    assert find_the_winner(4, 1) == 4


def test_find_the_winner_k_equals_n():
    assert find_the_winner(3, 3) == 2
