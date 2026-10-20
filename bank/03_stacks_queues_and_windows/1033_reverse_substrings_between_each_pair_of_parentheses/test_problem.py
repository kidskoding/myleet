from solution import reverse_parentheses


def test_reverse_parentheses_single_group():
    assert reverse_parentheses("(abcd)") == "dcba"


def test_reverse_parentheses_nested_once():
    assert reverse_parentheses("(u(love)i)") == "iloveu"


def test_reverse_parentheses_nested_twice():
    assert reverse_parentheses("(ed(et(oc))el)") == "leetcode"


def test_reverse_parentheses_no_parentheses():
    assert reverse_parentheses("abc") == "abc"


def test_reverse_parentheses_empty():
    assert reverse_parentheses("") == ""


def test_reverse_parentheses_text_outside_groups():
    assert reverse_parentheses("a(bcdefghijkl(mno)p)q") == "apmnolkjihgfedcbq"
