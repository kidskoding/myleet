from solution import count_homogenous


def test_count_homogenous_mixed_runs():
    assert count_homogenous("abbcccaa") == 13


def test_count_homogenous_distinct_letters():
    assert count_homogenous("xy") == 2


def test_count_homogenous_single_run():
    assert count_homogenous("zzzzz") == 15


def test_count_homogenous_single_character():
    assert count_homogenous("a") == 1


def test_count_homogenous_modulo():
    assert count_homogenous("a" * 100000) == 49965
