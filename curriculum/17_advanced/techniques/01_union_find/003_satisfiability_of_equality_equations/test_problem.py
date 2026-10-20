from solution import equations_possible


def test_equations_possible_satisfiable():
    assert equations_possible(["a==b", "b==c", "a==c"]) is True


def test_equations_possible_contradiction():
    assert equations_possible(["a==b", "b!=a"]) is False


def test_equations_possible_single_equation():
    assert equations_possible(["a==a"]) is True
