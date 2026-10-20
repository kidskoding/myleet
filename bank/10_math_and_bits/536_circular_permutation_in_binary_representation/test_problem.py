from solution import circular_permutation


def assert_valid(n: int, start: int, perm: list[int]) -> None:
    assert sorted(perm) == list(range(2**n))
    assert perm[0] == start
    for i in range(len(perm)):
        diff = perm[i] ^ perm[(i + 1) % len(perm)]
        assert diff and diff & (diff - 1) == 0


def test_circular_permutation_two_bits():
    assert_valid(2, 3, circular_permutation(2, 3))


def test_circular_permutation_three_bits():
    assert_valid(3, 2, circular_permutation(3, 2))


def test_circular_permutation_one_bit_start_zero():
    assert_valid(1, 0, circular_permutation(1, 0))


def test_circular_permutation_one_bit_start_one():
    assert_valid(1, 1, circular_permutation(1, 1))


def test_circular_permutation_larger():
    assert_valid(6, 37, circular_permutation(6, 37))
