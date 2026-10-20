from solution import kth_grammar


def test_kth_grammar_first_row():
    assert kth_grammar(1, 1) == 0


def test_kth_grammar_second_row_left():
    assert kth_grammar(2, 1) == 0


def test_kth_grammar_second_row_right():
    assert kth_grammar(2, 2) == 1


def test_kth_grammar_fourth_row():
    assert [kth_grammar(4, k) for k in range(1, 9)] == [0, 1, 1, 0, 1, 0, 0, 1]


def test_kth_grammar_large_row():
    assert kth_grammar(30, 2**29) == 1
