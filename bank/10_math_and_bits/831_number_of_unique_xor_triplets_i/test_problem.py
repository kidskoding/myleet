from solution import unique_xor_triplets


def test_unique_xor_triplets_example_two():
    assert unique_xor_triplets([1, 2]) == 2


def test_unique_xor_triplets_example_three():
    assert unique_xor_triplets([3, 1, 2]) == 4


def test_unique_xor_triplets_single():
    assert unique_xor_triplets([1]) == 1


def test_unique_xor_triplets_four():
    assert unique_xor_triplets([4, 1, 3, 2]) == 8


def test_unique_xor_triplets_seven():
    assert unique_xor_triplets([7, 6, 5, 4, 3, 2, 1]) == 8


def test_unique_xor_triplets_power_of_two_length():
    assert unique_xor_triplets([8, 1, 2, 3, 4, 5, 6, 7]) == 16
