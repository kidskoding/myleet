from solution import put_marbles


def test_put_marbles_example_one():
    assert put_marbles([1, 3, 5, 1], 2) == 4


def test_put_marbles_two_elements():
    assert put_marbles([1, 3], 2) == 0


def test_put_marbles_one_bag():
    assert put_marbles([1, 2, 3, 4], 1) == 0


def test_put_marbles_all_bags():
    assert put_marbles([1, 2, 3, 4], 4) == 0


def test_put_marbles_three_bags():
    assert put_marbles([1, 4, 2, 5, 2], 3) == 3
