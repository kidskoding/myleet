from solution import max_rep_opt1


def test_max_rep_opt1_alternating():
    assert max_rep_opt1("ababa") == 3


def test_max_rep_opt1_join_two_runs():
    assert max_rep_opt1("aaabaaa") == 6


def test_max_rep_opt1_already_uniform():
    assert max_rep_opt1("aaaaa") == 5


def test_max_rep_opt1_gap_of_two():
    assert max_rep_opt1("aaabbaaa") == 4


def test_max_rep_opt1_all_distinct():
    assert max_rep_opt1("abcdef") == 1


def test_max_rep_opt1_join_without_spare():
    assert max_rep_opt1("aaabaa") == 5
