from list_node import ListNode
from solution import has_cycle


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def node_at(head: ListNode | None, index: int) -> ListNode | None:
    for _ in range(index):
        head = head.next
    return head


def make_cycle(values: list[int], pos: int) -> ListNode | None:
    head = build_list(values)
    if pos < 0:
        return head
    tail = head
    while tail.next:
        tail = tail.next
    tail.next = node_at(head, pos)
    return head


def test_has_cycle_true():
    assert has_cycle(make_cycle([3, 2, 0, -4], 1))


def test_has_cycle_false():
    assert not has_cycle(build_list([1, 2, 3]))


def test_has_cycle_empty():
    assert not has_cycle(None)
