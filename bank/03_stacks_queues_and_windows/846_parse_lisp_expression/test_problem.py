from solution import evaluate


def test_evaluate_example_nested_scope():
    assert evaluate("(let x 2 (mult x (let x 3 y 4 (add x y))))") == 14


def test_evaluate_example_reassignment():
    assert evaluate("(let x 3 x 2 x)") == 2


def test_evaluate_example_sequential_assignment():
    assert evaluate("(let x 1 y 2 x (add x y) (add x y))") == 5


def test_evaluate_simple_add():
    assert evaluate("(add 1 2)") == 3


def test_evaluate_nested_arithmetic():
    assert evaluate("(mult 3 (add 2 3))") == 15


def test_evaluate_negative_and_alias():
    assert evaluate("(let x -2 y x y)") == -2


def test_evaluate_digit_in_name():
    assert evaluate("(let a1 3 b2 (add a1 1) b2)") == 4
