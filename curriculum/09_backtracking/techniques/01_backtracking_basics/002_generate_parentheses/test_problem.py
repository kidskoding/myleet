from solution import generate_parentheses


def test_generate_parentheses_single_pair():
    assert sorted(generate_parentheses(1)) == ["()"]


def test_generate_parentheses_two_pairs():
    assert sorted(generate_parentheses(2)) == sorted(["(())", "()()"])


def test_generate_parentheses_three_pairs():
    assert sorted(generate_parentheses(3)) == sorted(["((()))", "(()())", "(())()", "()(())", "()()()"])
