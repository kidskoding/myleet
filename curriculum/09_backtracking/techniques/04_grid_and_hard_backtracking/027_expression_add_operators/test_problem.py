from solution import add_operators


def test_add_operators_target_six():
    assert sorted(add_operators("123", 6)) == ["1*2*3", "1+2+3"]


def test_add_operators_multiplication_precedence():
    assert sorted(add_operators("232", 8)) == ["2*3+2", "2+3*2"]


def test_add_operators_no_solution():
    assert add_operators("3456237490", 9191) == []
