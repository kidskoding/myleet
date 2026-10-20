from solution import count_different_subsequence_gcds


def test_count_different_subsequence_gcds_example_one():
    assert count_different_subsequence_gcds([6, 10, 3]) == 5


def test_count_different_subsequence_gcds_example_two():
    assert count_different_subsequence_gcds([5, 15, 40, 5, 6]) == 7


def test_count_different_subsequence_gcds_single():
    assert count_different_subsequence_gcds([1]) == 1


def test_count_different_subsequence_gcds_chain_of_multiples():
    assert count_different_subsequence_gcds([2, 4, 8]) == 3


def test_count_different_subsequence_gcds_pairwise_gcds():
    assert count_different_subsequence_gcds([6, 10, 15]) == 7


def test_count_different_subsequence_gcds_duplicates():
    assert count_different_subsequence_gcds([7, 7]) == 1
