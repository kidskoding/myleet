from solution import minimize_result


def evaluate(expression: str, result: str) -> int:
    assert result.replace("(", "").replace(")", "") == expression
    before, rest = result.split("(")
    inside, after = rest.split(")")
    a, b = inside.split("+")
    assert a and b
    return (int(before) if before else 1) * (int(a) + int(b)) * (int(after) if after else 1)


def test_minimize_result_left_multiplier():
    assert minimize_result("247+38") == "2(47+38)"


def test_minimize_result_both_multipliers():
    assert minimize_result("12+34") == "1(2+3)4"


def test_minimize_result_wrap_everything():
    assert minimize_result("999+999") == "(999+999)"


def test_minimize_result_single_digits():
    assert minimize_result("1+1") == "(1+1)"


def test_minimize_result_ones_on_both_sides():
    assert evaluate("11+11", minimize_result("11+11")) == 2
