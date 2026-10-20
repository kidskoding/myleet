from solution import camel_match


def test_camel_match_two_letter_pattern():
    queries = ["FooBar", "FooBarTest", "FootBall", "FrameBuffer", "ForceFeedBack"]
    assert camel_match(queries, "FB") == [True, False, True, True, False]


def test_camel_match_longer_pattern():
    queries = ["FooBar", "FooBarTest", "FootBall", "FrameBuffer", "ForceFeedBack"]
    assert camel_match(queries, "FoBaT") == [False, True, False, False, False]
