from solution import divisible_triplet_count


def test_divisible_triplet_count_example_mixed():
    assert divisible_triplet_count([3, 3, 4, 7, 8], 5) == 3


def test_divisible_triplet_count_example_all_triplets():
    assert divisible_triplet_count([3, 3, 3, 3], 3) == 4


def test_divisible_triplet_count_example_none():
    assert divisible_triplet_count([3, 3, 3, 3], 6) == 0


def test_divisible_triplet_count_too_short():
    assert divisible_triplet_count([1, 2], 3) == 0


def test_divisible_triplet_count_divisor_one():
    assert divisible_triplet_count([5, 1, 9, 2, 7], 1) == 10


def test_divisible_triplet_count_large_values():
    assert divisible_triplet_count([1000000000, 999999999, 1, 2, 7], 7) == 2
