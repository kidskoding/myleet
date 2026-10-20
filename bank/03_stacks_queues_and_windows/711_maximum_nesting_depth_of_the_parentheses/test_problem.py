from solution import max_depth


def test_max_depth_example_one():
    assert max_depth("(1+(2*3)+((8)/4))+1") == 3


def test_max_depth_example_two():
    assert max_depth("(1)+((2))+(((3)))") == 3


def test_max_depth_only_parentheses():
    assert max_depth("()(())((()()))") == 3


def test_max_depth_no_parentheses():
    assert max_depth("1") == 0


def test_max_depth_single_pair():
    assert max_depth("(8)") == 1
