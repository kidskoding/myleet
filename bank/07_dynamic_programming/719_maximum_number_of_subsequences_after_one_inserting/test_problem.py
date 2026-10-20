from solution import num_of_subsequences


def test_num_of_subsequences_insert_l():
    assert num_of_subsequences("LMCT") == 2


def test_num_of_subsequences_two_cs():
    assert num_of_subsequences("LCCT") == 4


def test_num_of_subsequences_single_letter():
    assert num_of_subsequences("L") == 0


def test_num_of_subsequences_insert_c_between():
    assert num_of_subsequences("LLTT") == 4


def test_num_of_subsequences_insert_t():
    assert num_of_subsequences("LLLCC") == 6


def test_num_of_subsequences_unrelated_letters():
    assert num_of_subsequences("ABZ") == 0
