"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Edit2, Trash2, ChevronDown, ChevronRight, Layers, ArrowUp, ArrowDown, Settings, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function TemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [expandedTemplates, setExpandedTemplates] = useState<Record<string, boolean>>({});
  
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tplRes, grpRes] = await Promise.all([
        fetch("/api/boq-templates"),
        fetch("/api/boq-groups?all=true")
      ]);
      if (tplRes.ok) setTemplates(await tplRes.json());
      if (grpRes.ok) setGroups(await grpRes.json());
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedTemplates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- TEMPLATES ---
  const handleAddTemplate = async () => {
    try {
      const res = await fetch("/api/boq-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Template", category: "General" }),
      });
      if (res.ok) {
        const t = await res.json();
        setExpandedTemplates(prev => ({ ...prev, [t.id]: true }));
        fetchData();
      }
    } catch (e) {}
  };

  const handleTemplateChange = (id: string, field: string, value: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleTemplateBlur = async (id: string, field: string, value: string) => {
    try {
      await fetch(`/api/boq-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (e) {}
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await fetch(`/api/boq-templates/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e) {}
  };

  // --- SECTIONS ---
  const handleAddSection = async (templateId: string) => {
    if (groups.filter(g => g.isActive).length === 0) return alert("You need at least one active BOQ Group first.");
    const firstActiveGroup = groups.find(g => g.isActive);
    try {
      await fetch(`/api/boq-templates/${templateId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Section", groupId: firstActiveGroup.id }),
      });
      fetchData();
    } catch (e) {}
  };

  const handleSectionChange = (templateId: string, sectionId: string, field: string, value: string) => {
    setTemplates(prev => prev.map(t => {
      if (t.id === templateId) {
        return {
          ...t,
          sections: t.sections.map((s: any) => s.id === sectionId ? { ...s, [field]: value } : s)
        };
      }
      return t;
    }));
  };

  const handleSectionBlur = async (sectionId: string, field: string, value: string) => {
    try {
      await fetch(`/api/boq-template-sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (e) {}
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Delete this section?")) return;
    try {
      await fetch(`/api/boq-template-sections/${sectionId}`, { method: "DELETE" });
      fetchData();
    } catch (e) {}
  };

  const handleReorderSection = async (templateId: string, sectionId: string, direction: "up" | "down") => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    const idx = template.sections.findIndex((s: any) => s.id === sectionId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === template.sections.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const targetSection = template.sections[swapIdx];

    try {
      // Local swap for instant feedback
      const newSections = [...template.sections];
      const tempSort = newSections[idx].sortOrder;
      newSections[idx].sortOrder = newSections[swapIdx].sortOrder;
      newSections[swapIdx].sortOrder = tempSort;

      const temp = newSections[idx];
      newSections[idx] = newSections[swapIdx];
      newSections[swapIdx] = temp;
      setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, sections: newSections } : t));

      // Network request - in a real production app we might need a batch endpoint, but patching both works here
      await Promise.all([
        fetch(`/api/boq-template-sections/${sectionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: targetSection.sortOrder }) }),
        fetch(`/api/boq-template-sections/${targetSection.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: template.sections[idx].sortOrder }) }),
      ]);
      fetchData();
    } catch (e) { fetchData(); }
  };

  // --- ITEMS ---
  const handleAddItem = async (sectionId: string) => {
    try {
      await fetch(`/api/boq-template-sections/${sectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Item" }),
      });
      fetchData();
    } catch (e) {}
  };

  const handleItemChange = (templateId: string, sectionId: string, itemId: string, value: string) => {
    setTemplates(prev => prev.map(t => {
      if (t.id === templateId) {
        return {
          ...t,
          sections: t.sections.map((s: any) => {
            if (s.id === sectionId) {
              return {
                ...s,
                lineItems: s.lineItems.map((li: any) => li.id === itemId ? { ...li, title: value } : li)
              };
            }
            return s;
          })
        };
      }
      return t;
    }));
  };

  const handleItemBlur = async (itemId: string, value: string) => {
    try {
      await fetch(`/api/boq-template-line-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: value }),
      });
    } catch (e) {}
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await fetch(`/api/boq-template-line-items/${itemId}`, { method: "DELETE" });
      fetchData();
    } catch (e) {}
  };

  const handleReorderItem = async (templateId: string, sectionId: string, itemId: string, direction: "up" | "down") => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    const section = template.sections.find((s: any) => s.id === sectionId);
    if (!section) return;
    
    const idx = section.lineItems.findIndex((li: any) => li.id === itemId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === section.lineItems.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const targetItem = section.lineItems[swapIdx];

    try {
      await Promise.all([
        fetch(`/api/boq-template-line-items/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: targetItem.sortOrder }) }),
        fetch(`/api/boq-template-line-items/${targetItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: section.lineItems[idx].sortOrder }) }),
      ]);
      fetchData();
    } catch (e) { fetchData(); }
  };

  // --- GROUPS ---
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setAddingGroup(true);
    try {
      await fetch("/api/boq-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName }),
      });
      setNewGroupName("");
      fetchData();
    } catch (e) {} finally {
      setAddingGroup(false);
    }
  };

  const handleGroupChange = (id: string, value: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, name: value } : g));
  };

  const handleGroupBlur = async (id: string, value: string) => {
    try {
      const res = await fetch(`/api/boq-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      if (!res.ok) fetchData(); // revert on failure
    } catch (e) { fetchData(); }
  };

  const handleToggleGroupActive = async (id: string, isActive: boolean) => {
    try {
      setGroups(prev => prev.map(g => g.id === id ? { ...g, isActive } : g));
      await fetch(`/api/boq-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      fetchData();
    } catch (e) { fetchData(); }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">BOQ Templates</h1>
          <p className="text-sm text-slate-500 mt-1">Manage reusable structures for building estimates quickly.</p>
        </div>
        <Button onClick={handleAddTemplate} className="bg-blue-600 hover:bg-blue-700 font-bold">
          <Plus className="mr-2 h-4 w-4" /> New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* TEMPLATES EDITOR */}
        <div className="xl:col-span-2 space-y-4">
          {templates.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 italic">
              No templates created yet.
            </div>
          ) : templates.map((tpl) => (
            <Card key={tpl.id} className="overflow-hidden shadow-md">
              <div className="bg-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                  <button onClick={() => toggleExpand(tpl.id)} className="text-slate-400 hover:text-white p-1">
                    {expandedTemplates[tpl.id] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </button>
                  <div className="flex-1 flex gap-4">
                    <input
                      className="bg-slate-700/50 text-white font-bold px-3 py-1.5 rounded outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[200px]"
                      value={tpl.name}
                      onChange={(e) => handleTemplateChange(tpl.id, "name", e.target.value)}
                      onBlur={(e) => handleTemplateBlur(tpl.id, "name", e.target.value)}
                      placeholder="Template Name"
                    />
                    <input
                      className="bg-slate-700/50 text-slate-300 text-sm px-3 py-1.5 rounded outline-none focus:ring-2 focus:ring-blue-500 w-32"
                      value={tpl.category}
                      onChange={(e) => handleTemplateChange(tpl.id, "category", e.target.value)}
                      onBlur={(e) => handleTemplateBlur(tpl.id, "category", e.target.value)}
                      placeholder="Category"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(tpl.id)} className="text-rose-400 hover:text-rose-300 hover:bg-slate-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {expandedTemplates[tpl.id] && (
                <CardContent className="p-0 border-t border-slate-200 bg-slate-50">
                  <div className="p-4 space-y-6">
                    {tpl.sections.map((sec: any, sIdx: number) => (
                      <div key={sec.id} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                        {/* Section Header */}
                        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-3">
                          <Layers className="h-4 w-4 text-slate-500" />
                          <input
                            className="font-bold text-slate-900 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 flex-1 min-w-0"
                            value={sec.name}
                            onChange={(e) => handleSectionChange(tpl.id, sec.id, "name", e.target.value)}
                            onBlur={(e) => handleSectionBlur(sec.id, "name", e.target.value)}
                            placeholder="Section Name"
                          />
                          <select
                            className="text-sm bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 w-40"
                            value={sec.groupId}
                            onChange={(e) => handleSectionBlur(sec.id, "groupId", e.target.value)}
                          >
                            <option value={sec.groupId}>{sec.group.name}</option>
                            {groups.filter(g => g.isActive && g.id !== sec.groupId).map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleReorderSection(tpl.id, sec.id, "up")} disabled={sIdx === 0} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleReorderSection(tpl.id, sec.id, "down")} disabled={sIdx === tpl.sections.length - 1} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDeleteSection(sec.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded ml-2">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Line Items */}
                        <Table>
                          <TableHeader className="hidden">
                            <TableRow><TableHead>Title</TableHead><TableHead>Actions</TableHead></TableRow>
                          </TableHeader>
                          <TableBody>
                            {sec.lineItems.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={2} className="h-12 text-center text-slate-400 italic text-sm">No items added.</TableCell>
                              </TableRow>
                            ) : sec.lineItems.map((li: any, lIdx: number) => (
                              <TableRow key={li.id} className="group hover:bg-slate-50/50">
                                <TableCell className="p-0 border-r border-slate-100 align-top">
                                  <input
                                    className="w-full h-full min-h-[44px] px-4 py-2 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 text-sm font-medium"
                                    value={li.title}
                                    onChange={(e) => handleItemChange(tpl.id, sec.id, li.id, e.target.value)}
                                    onBlur={(e) => handleItemBlur(li.id, e.target.value)}
                                    placeholder="Item Title"
                                  />
                                </TableCell>
                                <TableCell className="w-24 p-0 text-center align-middle border-l border-slate-100">
                                  <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleReorderItem(tpl.id, sec.id, li.id, "up")} disabled={lIdx === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                                      <ArrowUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => handleReorderItem(tpl.id, sec.id, li.id, "down")} disabled={lIdx === sec.lineItems.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                                      <ArrowDown className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => handleDeleteItem(li.id)} className="p-1 text-rose-500 hover:text-rose-700 ml-1">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="bg-slate-50 px-4 py-2 border-t border-slate-200">
                          <Button variant="ghost" size="sm" onClick={() => handleAddItem(sec.id)} className="text-slate-500 hover:text-slate-900 h-7 text-xs font-semibold px-2">
                            <Plus className="mr-1.5 h-3 w-3" /> Add Item
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div>
                      <Button variant="outline" size="sm" onClick={() => handleAddSection(tpl.id)} className="border-dashed border-slate-300 text-slate-600 bg-white hover:bg-slate-50 font-bold">
                        <Plus className="mr-2 h-4 w-4" /> Add Section
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* GROUPS MANAGER */}
        <div className="xl:col-span-1">
          <Card className="shadow-md sticky top-6">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-500" />
                BOQ Groups
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Group Name</TableHead>
                    <TableHead className="w-24 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map(g => (
                    <TableRow key={g.id} className={g.isActive ? "" : "bg-slate-50 opacity-70"}>
                      <TableCell className="p-0 border-r border-slate-100">
                        <input
                          className={`w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 font-medium ${!g.isActive ? 'text-slate-500 line-through' : 'text-slate-900'}`}
                          value={g.name}
                          onChange={(e) => handleGroupChange(g.id, e.target.value)}
                          onBlur={(e) => handleGroupBlur(g.id, e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="p-0 text-center align-middle">
                        <button
                          onClick={() => handleToggleGroupActive(g.id, !g.isActive)}
                          className={`w-full h-full py-3 flex justify-center items-center ${g.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                          title={g.isActive ? "Deactivate Group" : "Activate Group"}
                        >
                          {g.isActive ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <form onSubmit={handleAddGroup} className="flex gap-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="New Group Name"
                    className="flex-1 px-3 py-1.5 text-sm rounded border border-slate-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <Button type="submit" size="sm" disabled={addingGroup} className="bg-slate-800 hover:bg-slate-900">
                    {addingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
