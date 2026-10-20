from tools.migrate.strip_key_idea import strip_key_idea


def test_strips_key_idea_and_continuation() -> None:
    src = (
        "def f(x: int) -> int:\n"
        "    # Problem 1: F\n"
        "    # Key idea: binary search on the answer\n"
        "    # under a split-count constraint.\n"
        "\n"
        "    # Time:\n"
        "    # Space:\n"
        "\n"
        "    raise NotImplementedError\n"
    )
    assert strip_key_idea(src) == (
        "def f(x: int) -> int:\n    # Problem 1: F\n\n    # Time:\n    # Space:\n\n    raise NotImplementedError\n"
    )


def test_leaves_other_comments() -> None:
    src = "class A:\n    # Interface provided by the problem.\n    def get(self) -> int:\n        raise NotImplementedError\n"
    assert strip_key_idea(src) == src
