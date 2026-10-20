from solution import good_triplets


def test_good_triplets_example_one():
    assert good_triplets([2, 0, 1, 3], [0, 1, 2, 3]) == 1


def test_good_triplets_example_two():
    assert good_triplets([4, 0, 1, 3, 2], [4, 1, 0, 2, 3]) == 4


def test_good_triplets_identical_permutations():
    assert good_triplets([0, 1, 2, 3, 4], [0, 1, 2, 3, 4]) == 10


def test_good_triplets_reversed_permutations():
    assert good_triplets([0, 1, 2, 3], [3, 2, 1, 0]) == 0


def test_good_triplets_minimum_length():
    assert good_triplets([0, 1, 2], [0, 1, 2]) == 1
