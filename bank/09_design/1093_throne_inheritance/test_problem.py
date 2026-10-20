from solution import ThroneInheritance


def test_throne_inheritance_example():
    t = ThroneInheritance("king")
    for parent, child in [
        ("king", "andy"),
        ("king", "bob"),
        ("king", "catherine"),
        ("andy", "matthew"),
        ("bob", "alex"),
        ("bob", "asha"),
    ]:
        t.birth(parent, child)
    assert t.get_inheritance_order() == ["king", "andy", "matthew", "bob", "alex", "asha", "catherine"]
    t.death("bob")
    assert t.get_inheritance_order() == ["king", "andy", "matthew", "alex", "asha", "catherine"]


def test_throne_inheritance_king_only():
    assert ThroneInheritance("king").get_inheritance_order() == ["king"]


def test_throne_inheritance_dead_king():
    t = ThroneInheritance("king")
    t.birth("king", "ann")
    t.death("king")
    assert t.get_inheritance_order() == ["ann"]


def test_throne_inheritance_deep_line_before_sibling():
    t = ThroneInheritance("k")
    t.birth("k", "a")
    t.birth("k", "b")
    t.birth("a", "c")
    t.birth("c", "d")
    assert t.get_inheritance_order() == ["k", "a", "c", "d", "b"]


def test_throne_inheritance_birth_to_dead_parent():
    t = ThroneInheritance("k")
    t.birth("k", "a")
    t.death("a")
    t.birth("a", "b")
    assert t.get_inheritance_order() == ["k", "b"]
