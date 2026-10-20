from solution import max_sum_after_partitioning


def test_max_sum_after_partitioning_example_one():
    assert max_sum_after_partitioning([1, 15, 7, 9, 2, 5, 10], 3) == 84


def test_max_sum_after_partitioning_example_two():
    assert max_sum_after_partitioning([1, 4, 1, 5, 7, 3, 6, 1, 9, 9, 3], 4) == 83


def test_max_sum_after_partitioning_example_single():
    assert max_sum_after_partitioning([1], 1) == 1


def test_max_sum_after_partitioning_whole_array_block():
    assert max_sum_after_partitioning([1, 2, 3], 3) == 9


def test_max_sum_after_partitioning_blocks_of_one():
    assert max_sum_after_partitioning([4, 0, 2], 1) == 6
